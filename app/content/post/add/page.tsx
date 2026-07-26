import { Metadata } from "next";
import PostAdd from "./PostAdd";

export const metadata: Metadata = {
    title: "Create New Post",
    description: "Create new content post for your website",
};

export default function Page() {
    return <PostAdd />;
}