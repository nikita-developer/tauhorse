import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'
import {slugify} from '../utils/slug.js'

const create = async ({name, description}) => {
    if (!name?.trim()) {
        throw ApiError.badRequest('Название категории обязательно')
    }

    const slug = slugify(name)

    if (!slug) {
        throw ApiError.badRequest('Некорректное название категории')
    }

    const existing_category = await prisma.category.findUnique({
        where: {
            slug
        }
    })

    if (existing_category) {
        throw ApiError.badRequest('Категория уже существует')
    }

    return prisma.category.create({
        data: {
            name: name.trim(),
            slug,
            description: description?.trim() || null
        }
    })
}

const getAll = async () => {
    return prisma.category.findMany({
        orderBy: {
            name: 'asc'
        },
        include: {
            _count: {
                select: {
                    products: true
                }
            }
        }
    })
}

const getById = async id => {
    const numeric_id = Number(id)

    if (!Number.isSafeInteger(numeric_id) || numeric_id <= 0) {
        throw ApiError.badRequest('Некорректный id категории')
    }

    const category = await prisma.category.findUnique({
        where: {
            id: numeric_id
        },
        include: {
            _count: {
                select: {
                    products: true
                }
            }
        }
    })

    if (!category) {
        throw ApiError.notFound('Категория не найдена')
    }

    return category
}

const update = async (id, {name, description}) => {
    const numeric_id = Number(id)

    if (!Number.isSafeInteger(numeric_id) || numeric_id <= 0) {
        throw ApiError.badRequest('Некорректный id категории')
    }

    const category = await prisma.category.findUnique({
        where: {
            id: numeric_id
        }
    })

    if (!category) {
        throw ApiError.notFound('Категория не найдена')
    }

    const next_name = name?.trim()

    if (!next_name) {
        throw ApiError.badRequest('Название категории обязательно')
    }

    const next_slug = slugify(next_name)

    if (!next_slug) {
        throw ApiError.badRequest('Некорректное название категории')
    }

    const existing_category = await prisma.category.findFirst({
        where: {
            slug: next_slug,
            NOT: {
                id: numeric_id
            }
        }
    })

    if (existing_category) {
        throw ApiError.badRequest('Категория с таким названием уже существует')
    }

    return prisma.category.update({
        where: {
            id: numeric_id
        },
        data: {
            name: next_name,
            slug: next_slug,
            description: description?.trim() || null
        }
    })
}

const remove = async id => {
    const numeric_id = Number(id)

    if (!Number.isSafeInteger(numeric_id) || numeric_id <= 0) {
        throw ApiError.badRequest('Некорректный id категории')
    }

    const category = await prisma.category.findUnique({
        where: {
            id: numeric_id
        },
        include: {
            _count: {
                select: {
                    products: true
                }
            }
        }
    })

    if (!category) {
        throw ApiError.notFound('Категория не найдена')
    }

    if (category._count.products > 0) {
        throw ApiError.badRequest('Нельзя удалить категорию, к которой привязаны товары')
    }

    await prisma.category.delete({
        where: {
            id: numeric_id
        }
    })

    return true
}

export default {
    create,
    getAll,
    getById,
    update,
    remove
}