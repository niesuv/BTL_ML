import { Button, Form, Input, message } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCookie, setCookie } from "../../utils/cookies";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getCookie("token");
    const username = getCookie("username");
    if (token && username) {
      navigate("/groups");
    }
  }, [navigate]);

  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          username: values.username,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        setCookie("token", data.access_token, 30);
        setCookie("username", values.username, 30);
        navigate("/groups");
      } else {
        message.error("Authentication failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error("Server error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 to-blue-300">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
          Login
        </h1>
        <Form layout="vertical" onFinish={handleLogin}>
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

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Login
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <span>Don't have an account? </span>
          <Button
            type="link"
            onClick={() => navigate("/create-user")}
            className="p-0"
          >
            Create One
          </Button>
        </div>
      </div>
    </div>
  );
}
