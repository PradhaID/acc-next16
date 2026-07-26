import { Metadata } from "next";
import PostEdit from "./PostEdit";

export const metadata: Metadata = {
    title: "Edit Post",
    description: "Edit your content post",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PostEdit id={id} />;
}