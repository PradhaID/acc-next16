import { Metadata } from "next";
import ContentPage from "./ContentPage";

export const metadata: Metadata = {
    title: "Content Category",
    description: "Manage and monitor your content category.",
};

export default function Page() {
    return <ContentPage />;
}
