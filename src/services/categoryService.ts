import prisma from '../prisma/client';

export async function ensureDefaultCategories(userId: number) {
    const defaultCategories = [
        { 
            name: "Transport", 
            keywords: "gulf,alharamain,taxi,uber,transport", 
            type: "EXPENSE" as const 
        },
        { 
            name: "Food", 
            keywords: "restaurant,food,dining,eat", 
            type: "EXPENSE" as const 
        },
        { 
            name: "Salary", 
            keywords: "salary,income,paycheck", 
            type: "INCOME" as const 
        },
    ];

    for (const cat of defaultCategories) {
        await prisma.category.upsert({
            where: { 
                userId_name: { 
                    userId, 
                    name: cat.name 
                } 
            },
            update: {},
            create: {
                user: { connect: { id: userId } },
                name: cat.name,
                keywords: cat.keywords,
                type: cat.type
            }
        });
    }
}