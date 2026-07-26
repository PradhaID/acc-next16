import { Metadata } from "next";
import CategoryAdd from "./CategoryAdd";

export const metadata: Metadata = {
    title: "Add Category",
};

export default function Page() {
    return <CategoryAdd />;
}