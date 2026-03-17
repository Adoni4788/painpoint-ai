import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9edf5] dark:bg-[#171717]">
      <SignIn />
    </div>
  );
}
