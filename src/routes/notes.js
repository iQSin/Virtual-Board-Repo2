const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authorize)

router.get('/', async (req, res) => {
    try {
        console.log('Auth user payload:', req.authUser);
        const notes = await prisma.note.findMany({
            where: { userId: req.authUser.userId },
            orderBy: { createdAt: 'asc' }
          });
        res.json(notes)
    } catch (error) {
        console.log(error)
        res.status(500).send({msg: "Error"})
    }
})

router.post('/', async (req, res) => {
    try {
        const { text, x, y, color } = req.body
        const note = await prisma.note.create({
          data: {
            text,
            userId: req.authUser.userId,
            x,
            y,
            color
          }
        })
        res.json(note)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to create note' })
    }
  })

router.put('/:id', (req, res) => {
    tempData[req.params.id] = req.body
        
    res.send({ 
        method: req.method, 
        body: req.body
    })

})

router.delete('/:id', async (req, res) => {
    try {
      const noteId = parseInt(req.params.id)
      if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid note ID' })
  
      const note = await prisma.note.findUnique({
        where: { id: noteId }
      })
  
      if (!note) return res.status(404).json({ error: 'Note not found' })
      if (note.userId !== req.authUser.userId) {
        return res.status(403).json({ error: 'Unauthorized to delete this note' })
      }
  
      await prisma.note.delete({ where: { id: noteId } })
      res.json({ message: 'Note deleted successfully' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to delete note' })
    }
  });

module.exports = router