import LoginForm from "../../components/LoginForm";
import { auth } from "../../auth";
import { redirect } from "next/navigation";


export default async function Login() {

    const session = await auth();
    if (session) redirect("/dashboard");
    return <LoginForm />;

};