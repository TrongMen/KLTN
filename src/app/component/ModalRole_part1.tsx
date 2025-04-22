"use client";

import React, { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";

interface Role {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  rolez: string;
  roleDescription: string;
}

const roleDisplayMap: Record<string, string> = {
  ADMIN: "Admin",
  GUEST: "Thành viên vãng lai",
  USER: "Thành viên nòng cốt",
};

const roleValueMap: Record<string, string> = {
  "Admin": "ADMIN",
  "Thành viên vãng lai": "GUEST",
  "Thành viên nòng cốt": "USER",
};
