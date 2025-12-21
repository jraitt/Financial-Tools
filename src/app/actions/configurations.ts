'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type SavedConfiguration = {
    id: string;
    name: string | null;
    inputData: any;
    updatedAt: Date | null;
    createdAt: Date | null;
};

export async function saveConfiguration(
    appId: string,
    name: string,
    data: any,
    id?: string
) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    const now = new Date();

    // Ensure data is stringified if it's an object
    const inputDataString = typeof data === 'string' ? data : JSON.stringify(data);

    if (id) {
        // Update existing
        await db.update(calculations)
            .set({
                name,
                inputData: inputDataString,
                updatedAt: now,
            })
            .where(and(
                eq(calculations.id, id),
                eq(calculations.userId, userId)
            ));
    } else {
        // Create new
        await db.insert(calculations).values({
            id: randomUUID(),
            userId,
            type: appId,
            name,
            inputData: inputDataString,
            createdAt: now,
            updatedAt: now,
        });
    }

    return { success: true };
}

export async function getConfigurations(appId: string): Promise<SavedConfiguration[]> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return [];
    }

    const configs = await db.select()
        .from(calculations)
        .where(and(
            eq(calculations.userId, session.user.id),
            eq(calculations.type, appId)
        ))
        .orderBy(desc(calculations.updatedAt));

    return configs.map(c => ({
        id: c.id,
        name: c.name,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
        inputData: c.inputData ? JSON.parse(c.inputData) : {},
    }));
}

export async function deleteConfiguration(id: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    await db.delete(calculations)
        .where(and(
            eq(calculations.id, id),
            eq(calculations.userId, session.user.id)
        ));

    return { success: true };
}
