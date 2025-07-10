import { Button, Form, Input, message, Select } from "antd";
import { useNavigate } from "react-router-dom";
import { backendUrl } from "../../http/api";

type UserCreatePayload = {
  username: string;
  password: string;
  email: string;
  full_name?: string;
  language?: "fr" | "en" | "vn";
};

const { Option } = Select;

export default function CreateUserPage() {
  const navigate = useNavigate();

  const handleCreateUser = async (values: UserCreatePayload) => {
    try {
      const response = await fetch(`${backendUrl}/user/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("🎉 User created successfully!");
        navigate("/login");
      } else {
        throw new Error("Creation failed");
      }
    } catch {
      message.error(
        "❌ There was a problem creating the user. Make sure the username and email are unique."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-200">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center text-purple-700">
          Create User
        </h1>

        <Form layout="vertical" onFinish={handleCreateUser}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please enter your username" }]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Invalid email format" },
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item label="Full Name" name="full_name">
            <Input placeholder="Enter your full name (optional)" />
          </Form.Item>

          <Form.Item
            label="Preferred Language"
            name="language"
            rules={[{ required: true, message: "Please select a language" }]}
          >
            <Select placeholder="Choose your language">
              <Option value="fr">🇫🇷 French</Option>
              <Option value="vn">🇻🇳 Vietnamese</Option>
              <Option value="en">🇬🇧 English</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Create User
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <span>Already have an account? </span>
          <Button
            type="link"
            onClick={() => navigate("/login")}
            className="p-0"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
