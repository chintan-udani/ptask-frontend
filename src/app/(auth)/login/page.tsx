 "use client";
import { LoginForm } from "@/app/components/auth/login-form";
import { useAuth } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (!loading && user) {
            router.replace("/chat");
        }
    }, [user, loading, router]);
    return <LoginForm />;
}
