import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/content/Category";
import mongoose from "mongoose";
import slugify from "slugify";

/* ======================================================
   GET – list / single / search / active filter
====================================================== */
export async function GET(req: Request) {
    try {
        await dbConnect();
        const url = new URL(req.url);

        const id = url.searchParams.get("id");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const search = url.searchParams.get("search")?.trim();
        const all = url.searchParams.get("all") === "true";
        const active = url.searchParams.get("active");

        /* =====================
           SINGLE BY ID
        ===================== */
        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return NextResponse.json(
                    { success: false, message: "Invalid category id" },
                    { status: 400 }
                );
            }

            const category = await Category.findById(id)
                .populate("parent", "name slug")
                .lean();

            if (!category) {
                return NextResponse.json(
                    { success: false, message: "Category not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: category });
        }

        /* =====================
           FILTER
        ===================== */
        const filter: any = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        if (active !== null) {
            filter.isActive = active === "true";
        }

        const total = await Category.countDocuments(filter);

        let query = Category.find(filter)
            .populate("parent", "name slug")
            .sort({ parent: 1, name: 1 });

        if (!all) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const categories = await query.lean();

        return NextResponse.json({
            success: true,
            total,
            page: all ? 1 : page,
            limit: all ? total : limit,
            data: categories,
        });
    } catch (err) {
        console.error("GET Category Error:", err);
        return NextResponse.json(
            { success: false, message: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

/* ======================================================
   POST – create category
====================================================== */
export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const { name, slug, parent, description } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, message: "Category name is required" },
                { status: 400 }
            );
        }

        const finalSlug = slug
            ? slugify(slug, { lower: true, strict: true })
            : slugify(name, { lower: true, strict: true });

        const category = await Category.create({
            name,
            slug: finalSlug,
            description: description || null,
            parent: parent || null,
            locale: body.locale || "id_ID",
            meta: body.meta,
            isActive: true,
            created: { at: new Date(), by: null },
            updated: { at: new Date(), by: null },
        });

        return NextResponse.json(
            { success: true, data: category },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("POST Category Error:", err);

        if (err.code === 11000) {
            return NextResponse.json(
                { success: false, message: "Category slug already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, message: "Failed to create category" },
            { status: 500 }
        );
    }
}

/* ======================================================
   PUT – update category
====================================================== */
export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const { id, name, slug, parent, description, isActive, locale } = body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid category id" },
                { status: 400 }
            );
        }

        const updateData: any = {
            updated: { at: new Date(), by: null },
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (parent !== undefined) updateData.parent = parent || null;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (locale !== undefined) updateData.locale = locale;

        if (body.meta) {
            updateData.meta = {
                title: body.meta.title || null,
                description: body.meta.description || null
            };
        }

        if (body.structuredData) {
            updateData.structuredData = {
                type: body.structuredData.type || "CollectionPage",
                image: body.structuredData.image || null
            };
        }

        if (slug !== undefined) {
            updateData.slug = slugify(slug, {
                lower: true,
                strict: true,
            });
        }

        const category = await Category.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: 'after' }
        ).populate("parent", "name slug");

        if (!category) {
            return NextResponse.json(
                { success: false, message: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: category });
    } catch (err) {
        console.error("PUT Category Error:", err);
        return NextResponse.json(
            { success: false, message: "Failed to update category" },
            { status: 500 }
        );
    }
}

/* ======================================================
   DELETE – soft delete (isActive = false)
====================================================== */
export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid category id" },
                { status: 400 }
            );
        }

        const category = await Category.findByIdAndUpdate(
            id,
            {
                isActive: false,
                updated: { at: new Date(), by: null },
            },
            { returnDocument: 'after' }
        );

        if (!category) {
            return NextResponse.json(
                { success: false, message: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Category deactivated",
        });
    } catch (err) {
        console.error("DELETE Category Error:", err);
        return NextResponse.json(
            { success: false, message: "Failed to delete category" },
            { status: 500 }
        );
    }
}