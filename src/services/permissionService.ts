const API_BASE_URL = "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/permissions";

export async function getPermissions(token: string) {
  const response = await fetch(API_BASE_URL, {
    method: "GET",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch permissions");
  }
  return await response.json();
}

export async function addPermission(permissionData: any, token: string) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(permissionData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add permission");
  }
  return await response.json();
}

export async function deletePermission(permissionId: string, token: string) {
  const response = await fetch(\`\${API_BASE_URL}/\${permissionId}\`, {
    method: "DELETE",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete permission");
  }
  return await response.json();
}
