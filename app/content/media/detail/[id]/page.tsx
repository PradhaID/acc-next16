import { Metadata } from "next";

import MediaDetail from "./MediaDetail";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    return {
        title: "Media Detail",
        description: "View and manage content media",
    };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <MediaDetail id={id} />;
}