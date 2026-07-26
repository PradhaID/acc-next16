import { Metadata } from "next";
import ContentCategoryEdit from "./CategoryEdit";

export const metadata: Metadata = {
    title: "Edit Category",
    description: "Edit content category",
};

export default function Page() {
    return <ContentCategoryEdit />;
}