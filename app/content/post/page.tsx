import { Metadata } from "next";
import ContentPost from "./ContentPost";

export const metadata: Metadata = {
    title: "Content Posts",
    description: "Manage your web content posts",
};

export default function Page() {
    return <ContentPost />;
}