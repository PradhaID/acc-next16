import { Metadata } from "next";
import PageEdit from "./PageEdit";

export const metadata: Metadata = {
    title: "Edit Page",
    description: "Edit your site page",
};

export default async function Page() {
    return <PageEdit />;
}