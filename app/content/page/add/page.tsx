import { Metadata } from "next";
import PageAdd from "./PageAdd";

export const metadata: Metadata = {
    title: "Create New Page",
    description: "Create new site page for your website",
};

export default function Page() {
    return <PageAdd />;
}