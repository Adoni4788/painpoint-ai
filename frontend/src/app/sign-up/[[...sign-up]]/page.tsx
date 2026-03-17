import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9edf5] dark:bg-[#171717]">
      <SignUp />
    </div>
  );
}
