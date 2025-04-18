// utils/auth.js
import jwtDecode from "jwt-decode";

export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};