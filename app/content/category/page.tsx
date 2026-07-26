import { Metadata } from "next";
import ContentCategoryPage from "./ContentCategory";

export const metadata: Metadata = {
    title: "Content Category",
    description: "Manage and monitor your content category.",
};

export default function Page() {
    return <ContentCategoryPage />;
}
