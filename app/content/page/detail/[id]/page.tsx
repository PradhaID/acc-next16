import { Metadata } from "next";
import { getPageById } from "@/lib/data";
import PageDetail from "./PageDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;

    try {
        const page = await getPageById(id);

        if (!page) {
            return {
                title: "Page Detail",
                description: "View and manage page details",
            };
        }

        const status = page.status ? ` (${page.status})` : '';

        return {
            title: `Page | ${page.title}${status}`,
            description: page.meta?.description || page.excerpt || `Details for ${page.title}`,
        };
    } catch (error) {
        console.error('Error fetching page metadata:', error);
    }

    return {
        title: "Page Detail",
        description: "View and manage page details",
    };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PageDetail id={id} />;
}