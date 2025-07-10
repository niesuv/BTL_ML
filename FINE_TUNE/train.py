from unsloth import FastLanguageModel
import torch
from datasets import load_dataset

from trl import SFTTrainer
from transformers import TrainingArguments

chosen_model = "unsloth/mistral-7b-v0.3"


model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = chosen_model,
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = False,
)


dataset = load_dataset("json", data_files="Data.jsonl", split="train")
dataset = dataset.shuffle(seed=42)


EOS_TOKEN = tokenizer.eos_token # Must add EOS_TOKEN
def formatting_prompts_func(examples):
    convos = examples["messages"]
    texts = []
    mapper = {"system" : "<|im_start|>system\n", "user" : "\n<|im_start|>user\n", "assistant" : "\n<|im_start|>assistant\n"}
    end_mapper = {"system" : "<|im_end|>", "user" : "<|im_end|>", "assistant" : "<|im_end|>"}
    for convo in convos:
        text = "".join(f"{mapper[(turn := x['role'])]} {x['content']}\n{end_mapper[turn]}" for x in convo)
        texts.append(f"{text}{EOS_TOKEN}") # Since there are multi-turn
        # conversations, I append the EOS_TOKEN at the end of the whole
        # conversation. These conversations always ends with a gpt message.
    return { "text" : texts, }

dataset = dataset.map(formatting_prompts_func, batched = True,)



model = FastLanguageModel.get_peft_model(
    model,
    r = 16, 
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj",],
    lora_alpha = 16,
    lora_dropout = 0, 
    bias = "none",   
    use_gradient_checkpointing = True,
    random_state = 3407,
    use_rslora = False,  
    loftq_config = None, 
)


trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = 2048,
    dataset_num_proc = 2,
    packing = False, # Can make training 5x faster for short sequences.
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        num_train_epochs=3,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)
model = model.merge_and_unload()
username = ""
your_token = ""
model.push_to_hub(f"{username}/MLBTL_merged", token = your_token) # Online saving
