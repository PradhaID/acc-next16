import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ads from "@/models/content/Ads";
import mongoose from "mongoose";
import { logAction, logError, getSessionFromRequest } from "@/lib/log";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const url = new URL(req.url);

        const id = url.searchParams.get("id");
        const position = url.searchParams.get("position");
        const activeOnly = url.searchParams.get("activeOnly") === "true";

        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return NextResponse.json(
                    { success: false, message: "Invalid ad id" },
                    { status: 400 }
                );
            }

            const ad = await Ads.findById(id).lean();

            if (!ad) {
                return NextResponse.json(
                    { success: false, message: "Ad not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: ad });
        }

        const filter: any = {};
        if (position) {
            filter.position = position;
        }
        if (activeOnly) {
            filter.isActive = true;
            const now = new Date();
            filter.$and = [
                { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
                { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
            ];
        }

        const ads = await Ads.find(filter).sort({ "created.at": -1 }).lean();

        return NextResponse.json({
            success: true,
            data: ads,
        });
    } catch (err) {
        console.error("GET Ads Error:", err);
        return NextResponse.json(
            { success: false, message: "Failed to fetch ads" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const session = await getSessionFromRequest(req);
        const body = await req.json();

        const { name, position, type, items, isActive, isFirstTimeOnly, startDate, endDate, adsenseCode } = body;

        if (!name || !position) {
            return NextResponse.json(
                { success: false, message: "Name and position are required" },
                { status: 400 }
            );
        }

        const ad = await Ads.create({
            name,
            position,
            type: type || "SINGLE",
            items: type === "ADSENSE" ? [] : (items || []),
            adsenseCode: adsenseCode || null,
            isActive: isActive !== undefined ? isActive : true,
            isFirstTimeOnly: !!isFirstTimeOnly,
            startDate: startDate || null,
            endDate: endDate || null,
            created: { at: new Date(), by: null },
            updated: { at: new Date(), by: null },
        });

        if (session) {
            await logAction({
                userId: session.userId,
                username: session.username,
                action: "CREATE_AD",
                category: "AD",
                target: `ad:${name}`,
                detail: `Position: ${position}, Type: ${type || "SINGLE"}`,
            });
        }

        return NextResponse.json(
            { success: true, data: ad },
            { status: 201 }
        );
    } catch (err) {
        await logError(req, "CREATE_AD", "ad:new", err, "AD");
        return NextResponse.json(
            { success: false, message: "Failed to create ad" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const session = await getSessionFromRequest(req);
        const body = await req.json();

        const { id, name, position, type, items, isActive, isFirstTimeOnly, startDate, endDate, adsenseCode } = body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid ad id" },
                { status: 400 }
            );
        }

        const old = await Ads.findById(id).lean();

        const ad = await Ads.findByIdAndUpdate(
            id,
            {
                name,
                position,
                type,
                items: type === "ADSENSE" ? [] : items,
                adsenseCode: adsenseCode || null,
                isActive,
                isFirstTimeOnly,
                startDate: startDate || null,
                endDate: endDate || null,
                updated: { at: new Date(), by: null },
            },
            { new: true }
        );

        if (!ad) {
            return NextResponse.json(
                { success: false, message: "Ad not found" },
                { status: 404 }
            );
        }

        if (session) {
            const changes: string[] = [];
            if (old && old.name !== name) changes.push(`name: ${old.name} → ${name}`);
            if (old && old.isActive !== isActive) changes.push(`active: ${old.isActive} → ${isActive}`);

            await logAction({
                userId: session.userId,
                username: session.username,
                action: "UPDATE_AD",
                category: "AD",
                target: `ad:${name}`,
                detail: changes.length ? changes.join(", ") : "Updated",
                oldValue: JSON.stringify({ name: old?.name, position: old?.position, isActive: old?.isActive }),
                newValue: JSON.stringify({ name, position, isActive }),
            });
        }

        return NextResponse.json({ success: true, data: ad });
    } catch (err) {
        await logError(req, "UPDATE_AD", "ad:unknown", err, "AD");
        return NextResponse.json(
            { success: false, message: "Failed to update ad" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const session = await getSessionFromRequest(req);
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid ad id" },
                { status: 400 }
            );
        }

        const ad = await Ads.findByIdAndDelete(id);

        if (!ad) {
            return NextResponse.json(
                { success: false, message: "Ad not found" },
                { status: 404 }
            );
        }

        if (session) {
            await logAction({
                userId: session.userId,
                username: session.username,
                action: "DELETE_AD",
                category: "AD",
                target: `ad:${ad.name}`,
                oldValue: `Position: ${ad.position}, Active: ${ad.isActive}`,
            });
        }

        return NextResponse.json({
            success: true,
            message: "Ad deleted successfully",
        });
    } catch (err) {
        await logError(req, "DELETE_AD", "ad:unknown", err, "AD");
        return NextResponse.json(
            { success: false, message: "Failed to delete ad" },
            { status: 500 }
        );
    }
}
