import React, { Suspense } from "react";
import AuthLayout from "../login/components/AuthLayout";
import ResetPasswordForm from "./components/ResetPasswordForm";

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <span className="loading loading-spinner loading-md" />
      <span className="text-base-content/60 text-sm">Betöltés...</span>
    </div>
  );
}

export default function Page() {
  return (
    <AuthLayout>
      <Suspense fallback={<LoadingFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
