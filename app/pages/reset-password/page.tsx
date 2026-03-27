import React from "react";
import AuthLayout from "../login/components/AuthLayout";
import ResetPasswordForm from "./components/ResetPasswordForm";

export default function Page() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
