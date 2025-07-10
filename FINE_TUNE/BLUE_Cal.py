from datasets import load_dataset
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import evaluate
from tqdm import tqdm
import torch

# Load BLEU metric
bleu = evaluate.load("bleu")

# Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("vcmt794/MLBTL_merged")
model = AutoModelForCausalLM.from_pretrained("vcmt794/MLBTL_merged").to("cuda")

# Load data
dataset = load_dataset("json", data_files="Data.jsonl", split="train")

# Preprocess function to create prompts
def create_prompt(example):
    prompt = ""
    for turn in example["messages"]:
        if turn["role"] in ["system", "user"]:
            prompt += f"<|im_start|>{turn['role']}\n{turn['content']}\n<|im_end|>"
    return {
        "prompt": prompt,
        "reference": next(turn["content"] for turn in example["messages"] if turn["role"] == "assistant")
    }

# Process dataset
processed_data = dataset.map(create_prompt)

# Batch processing
batch_size = 8  # Adjust based on GPU memory
predictions = []
references = []

for i in tqdm(range(0, len(processed_data), batch_size)):
    batch = processed_data[i:i+batch_size]
    
    # Tokenize and generate
    inputs = tokenizer(
        batch["prompt"],
        return_tensors="pt",
        padding=True,
        truncation=True
    ).to("cuda")
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=100,
            do_sample=False
        )
    
    # Decode and process outputs
    gen_texts = tokenizer.batch_decode(outputs, skip_special_tokens=False)
    
    for gen_text, ref_text in zip(gen_texts, batch["reference"]):
        if "<|im_start|>assistant\n" in gen_text:
            gen_text = gen_text.split("<|im_start|>assistant\n", 1)[-1].split("<|im_end|>")[0].strip()
        else:
            gen_text = gen_text[len(batch["prompt"][0]):].strip() if i == 0 else gen_text.strip()
        
        predictions.append(gen_text)
        references.append(ref_text)

# Calculate BLEU

result = bleu.compute(predictions=predictions, references=[[ref] for ref in references])
print(f"BLEU score: {result['bleu']:.4f}")