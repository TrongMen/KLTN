// useFetchCommonData.js
import { useEffect, useState } from "react";

export default function useFetchCommonData() {
  const [roles, setRoles] = useState([]);
  const [positions, setPositions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const [positionsRes, rolesRes, usersRes] = await Promise.all([
          fetch("http://localhost:8080/identity/api/positions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8080/identity/api/organizerrole", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8080/identity/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!positionsRes.ok || !rolesRes.ok || !usersRes.ok) {
          throw new Error("Fetch error");
        }

        const positionsData = await positionsRes.json();
        const rolesData = await rolesRes.json();
        const usersData = await usersRes.json();

        setPositions(positionsData.result || []);
        setRoles(rolesData.result || []);
        setUsers(usersData.result || []);
      } catch (err) {
        setError("Không thể tải dữ liệu");
        console.error("Lỗi fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { positions, roles, users, loading, error };
}
