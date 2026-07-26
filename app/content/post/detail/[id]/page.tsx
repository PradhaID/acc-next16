import { Metadata } from "next";
import PostDetail from "./PostDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;

    // Simple static metadata - we'll update the title client-side if needed
    return {
        title: "Post Detail",
        description: "View and manage post details",
    };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PostDetail id={id} />;
}