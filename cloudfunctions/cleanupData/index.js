// 云函数：清理重复数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'cleanupMenu') {
    // 清理重复的菜品数据
    try {
      // 获取所有菜品
      const menuRes = await db.collection('menu').get()
      const menuList = menuRes.data

      // 按 id 分组，找出重复的
      const idMap = {}
      const duplicates = []

      for (const item of menuList) {
        if (idMap[item.id]) {
          // 已存在，标记为重复
          duplicates.push(item._id)
        } else {
          idMap[item.id] = item._id
        }
      }

      // 删除重复的
      let deletedCount = 0
      for (const _id of duplicates) {
        try {
          await db.collection('menu').doc(_id).remove()
          deletedCount++
        } catch (e) {
          console.error('删除失败:', _id, e)
        }
      }

      return {
        success: true,
        message: `清理完成，删除了 ${deletedCount} 条重复的菜品数据`,
        total: menuList.length,
        unique: Object.keys(idMap).length,
        deleted: deletedCount
      }
    } catch (err) {
      return {
        success: false,
        error: err.message
      }
    }
  }

  if (action === 'cleanupCategories') {
    // 清理重复的分类数据
    try {
      const catRes = await db.collection('categories').get()
      const catList = catRes.data

      const idMap = {}
      const duplicates = []

      for (const item of catList) {
        if (idMap[item.id]) {
          duplicates.push(item._id)
        } else {
          idMap[item.id] = item._id
        }
      }

      let deletedCount = 0
      for (const _id of duplicates) {
        try {
          await db.collection('categories').doc(_id).remove()
          deletedCount++
        } catch (e) {
          console.error('删除失败:', _id, e)
        }
      }

      return {
        success: true,
        message: `清理完成，删除了 ${deletedCount} 条重复的分类数据`,
        total: catList.length,
        unique: Object.keys(idMap).length,
        deleted: deletedCount
      }
    } catch (err) {
      return {
        success: false,
        error: err.message
      }
    }
  }

  return {
    success: false,
    error: '无效的操作'
  }
}
