import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getCategories = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const type = req.query.type as string | undefined;

  const whereClause: any = { userId };
  if (type) {
    whereClause.type = type.toUpperCase();
  }

  const categories = await prisma.category.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  res.json(categories);
};

export const updateCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const categoryId = Number(req.params.id);
  const { name, keywords, type } = req.body;

  const category = await prisma.category.updateMany({
    where: { id: categoryId, userId },
    data: { name, keywords, type },
  });

  res.json(category);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const categoryId = Number(req.params.id);

  await prisma.category.deleteMany({
    where: { id: categoryId, userId },
  });

  res.status(204).send();
};
