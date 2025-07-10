import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  message,
  Space,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backendUrl } from "../../http/api";
import { getCookie, setCookie } from "../../utils/cookies";
import GroupList from "./GroupList";

const { Title } = Typography;

interface Group {
  id: string;
  name: string;
  address: string;
  notfound?: boolean;
}

export default function GroupPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getCookie("token");
    const username = getCookie("username");

    if (!token || !username) {
      navigate("/login");
      return;
    }

    const headers = new Headers({
      Authorization: `Bearer ${token}`,
    });

    fetch(`${backendUrl}/user/groups`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (!data.groups || data.groups.length === 0) {
          setGroups([]);
        } else {
          setGroups(data.groups);
        }
      })
      .catch(() => {
        message.error("Session expired. Please log in again.");
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleGroupClick = (group: Group) => {
    setCookie("group", group.id, 1);
    setCookie("group_name", group.name, 1);
    navigate("/chats");
  };

  const handleCreateGroup = async (values: Group) => {
    const token = getCookie("token");
    try {
      const response = await fetch(
        `${backendUrl}/group/create/?address=${values.address}&name=${values.name}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to create group");
      message.success("Group created successfully");
      window.location.reload();
    } catch {
      message.error("Failed to create group. Try again.");
    }
  };

  const handleJoinGroup = async (values: { address: string }) => {
    const token = getCookie("token");
    try {
      const response = await fetch(
        `${backendUrl}/group/join?address=${values.address}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 404) {
        message.error("❌ No group found with that @username");
        return;
      }
      if (!response.ok) throw new Error("Join group failed");

      message.success("🎉 Joined group successfully!");
      window.location.reload();
    } catch {
      message.error("Something went wrong. Try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Title level={2}>💬 Your Groups</Title>

      {loading ? (
        <Spin size="large" />
      ) : groups.length === 0 ? (
        <Empty description="You're not in any group yet 😴" />
      ) : (
        <GroupList groups={groups} onSelect={handleGroupClick} />
      )}

      <Divider className="my-8" />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="🚀 Create New Group" bordered={false}>
          <Form layout="vertical" onFinish={handleCreateGroup}>
            <Form.Item
              name="name"
              label="Group Name"
              rules={[{ required: true, message: "Please enter group name" }]}
            >
              <Input placeholder="e.g., Study Buddies" />
            </Form.Item>
            <Form.Item
              name="address"
              label="@username"
              rules={[
                { required: true, message: "Please enter your @username" },
              ]}
            >
              <Input placeholder="e.g., study123" prefix="@" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Create Group
            </Button>
          </Form>
        </Card>

        <Card title="🔗 Join Existing Group" bordered={false}>
          <Form layout="vertical" onFinish={handleJoinGroup}>
            <Form.Item
              name="address"
              label="@username"
              rules={[
                { required: true, message: "Please enter group @username" },
              ]}
            >
              <Input placeholder="e.g., friendschat" prefix="@" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Join Group
            </Button>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
