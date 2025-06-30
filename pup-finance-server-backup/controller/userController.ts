import prisma from "../config/prisma";
// I need to implement some kind of user validation

export const getCurrentUser = async function(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: {id: req.auth.payload.sub}
        })
    } catch (error) {
        next(error)
    }
}
export const updateUser= async function(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: {id: req.auth.payload.sub}
        })
    } catch (error) {
        next(error)
    }
}
export const deleteCurrentUser = async function(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: {id: req.auth.payload.sub}
        })
    } catch (error) {
        next(error)
    }
}