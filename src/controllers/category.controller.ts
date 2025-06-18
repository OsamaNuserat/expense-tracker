import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';

export const getCategories = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const type = req.query.type as string | undefined;

  const whereClause: any = { userId };
  if (type) whereClause.type = type.toUpperCase();

  const categories = await prisma.category.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  res.json(categories);
};

export const addCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { name, keywords, type } = req.body;

  if (!name || !type) {
    throw createError(400, 'Name and type are required');
  }

  const newCategory = await prisma.category.create({
    data: {
      userId,
      name,
      keywords: keywords || '',
      type: type.toUpperCase(),
    },
  });

  res.status(201).json(newCategory);
};

export const updateCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const categoryId = Number(req.params.id);
  const { name, keywords, type } = req.body;

  if (isNaN(categoryId)) throw createError(400, 'Invalid category ID');

  const updated = await prisma.category.updateMany({
    where: { id: categoryId, userId },
    data: { name, keywords, type: type?.toUpperCase() },
  });

  if (updated.count === 0) throw createError(404, 'Category not found or unauthorized');

  res.json({ message: 'Category updated' });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const categoryId = Number(req.params.id);

  if (isNaN(categoryId)) throw createError(400, 'Invalid category ID');

  const deleted = await prisma.category.deleteMany({
    where: { id: categoryId, userId },
  });

  if (deleted.count === 0) throw createError(404, 'Category not found or unauthorized');

  res.status(204).send();
};
