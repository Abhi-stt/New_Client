const moment = require('moment');

/**
 * Generate recurring task instances based on recurrence settings
 * @param {Object} task - The original task with recurrence settings
 * @param {Date} startDate - Start date for generating instances
 * @param {Date} endDate - End date for generating instances
 * @returns {Array} Array of task instances with calculated due dates
 */
function generateRecurringInstances(task, startDate = new Date(), endDate = null) {
  if (!task.isRecurring || !task.recurrenceType || !task.dueDate) {
    return [task]; // Return original task if not recurring
  }

  const instances = [];
  const originalDueDate = moment(task.dueDate);
  const start = moment(startDate);
  const end = endDate ? moment(endDate) : moment().add(1, 'year'); // Default to 1 year ahead
  
  let currentDate = originalDueDate.clone();
  let instanceCount = 0;
  const maxInstances = task.recurrenceCount || 1000; // Default to 1000 if no limit

  // Generate instances based on recurrence type
  while (currentDate.isBefore(end) && instanceCount < maxInstances) {
    // Check if current date is within our range
    if (currentDate.isAfter(start) || currentDate.isSame(start, 'day')) {
      const instance = {
        ...task.toObject(),
        _id: `${task._id}_${currentDate.format('YYYY-MM-DD')}`, // Unique ID for each instance
        originalTaskId: task._id,
        dueDate: currentDate.toDate(),
        isRecurringInstance: true,
        instanceDate: currentDate.toDate()
      };
      instances.push(instance);
      instanceCount++;
    }

    // Calculate next occurrence based on recurrence type
    currentDate = getNextRecurrenceDate(currentDate, task);
    
    // Safety check to prevent infinite loops
    if (instanceCount > 1000) break;
  }

  return instances;
}

/**
 * Calculate the next recurrence date based on task settings
 * @param {moment} currentDate - Current date
 * @param {Object} task - Task with recurrence settings
 * @returns {moment} Next recurrence date
 */
function getNextRecurrenceDate(currentDate, task) {
  const interval = task.recurrenceInterval || 1;
  
  switch (task.recurrenceType) {
    case 'daily':
      return currentDate.clone().add(interval, 'days');
    
    case 'weekly':
      if (task.recurrenceDaysOfWeek && task.recurrenceDaysOfWeek.length > 0) {
        // Find next occurrence on specified days of week
        return getNextWeeklyOccurrence(currentDate, task.recurrenceDaysOfWeek, interval);
      }
      return currentDate.clone().add(interval, 'weeks');
    
    case 'monthly':
      if (task.recurrenceDayOfMonth) {
        // Recur on specific day of month
        return getNextMonthlyOccurrence(currentDate, task.recurrenceDayOfMonth, interval);
      }
      return currentDate.clone().add(interval, 'months');
    
    case 'yearly':
      return currentDate.clone().add(interval, 'years');
    
    default:
      return currentDate.clone().add(1, 'day'); // Default to daily
  }
}

/**
 * Get next weekly occurrence on specified days
 * @param {moment} currentDate - Current date
 * @param {Array} daysOfWeek - Array of day numbers (0=Sunday, 6=Saturday)
 * @param {number} interval - Week interval
 * @returns {moment} Next occurrence date
 */
function getNextWeeklyOccurrence(currentDate, daysOfWeek, interval) {
  const currentDay = currentDate.day();
  const sortedDays = daysOfWeek.sort((a, b) => a - b);
  
  // Find next day in current week
  for (const day of sortedDays) {
    if (day > currentDay) {
      return currentDate.clone().day(day);
    }
  }
  
  // If no day found in current week, go to next interval week
  const nextWeek = currentDate.clone().add(interval, 'weeks');
  return nextWeek.day(sortedDays[0]);
}

/**
 * Get next monthly occurrence on specific day of month
 * @param {moment} currentDate - Current date
 * @param {number} dayOfMonth - Day of month (1-31)
 * @param {number} interval - Month interval
 * @returns {moment} Next occurrence date
 */
function getNextMonthlyOccurrence(currentDate, dayOfMonth, interval) {
  const nextMonth = currentDate.clone().add(interval, 'months');
  
  // Handle edge cases for day of month
  const daysInMonth = nextMonth.daysInMonth();
  const targetDay = Math.min(dayOfMonth, daysInMonth);
  
  return nextMonth.date(targetDay);
}

/**
 * Filter recurring instances for a specific date range
 * @param {Array} instances - Array of recurring instances
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered instances
 */
function filterInstancesByDateRange(instances, startDate, endDate) {
  const start = moment(startDate);
  const end = moment(endDate);
  
  return instances.filter(instance => {
    const instanceDate = moment(instance.dueDate);
    return instanceDate.isBetween(start, end, 'day', '[]'); // Inclusive
  });
}

/**
 * Get calendar events from tasks (including recurring instances)
 * @param {Array} tasks - Array of tasks
 * @param {Date} startDate - Calendar start date
 * @param {Date} endDate - Calendar end date
 * @returns {Array} Calendar events
 */
function getCalendarEventsFromTasks(tasks, startDate, endDate) {
  const events = [];
  
  tasks.forEach(task => {
    if (task.isRecurring) {
      // Generate recurring instances
      const instances = generateRecurringInstances(task, startDate, endDate);
      instances.forEach(instance => {
        events.push({
          id: instance._id,
          title: instance.title,
          date: instance.dueDate,
          priority: instance.priority,
          clientName: instance.clientName,
          description: instance.description,
          status: instance.status,
          isRecurring: true,
          originalTaskId: instance.originalTaskId
        });
      });
    } else {
      // Single occurrence task
      events.push({
        id: task._id,
        title: task.title,
        date: task.dueDate,
        priority: task.priority,
        clientName: task.clientName,
        description: task.description,
        status: task.status,
        isRecurring: false
      });
    }
  });
  
  return events;
}

module.exports = {
  generateRecurringInstances,
  getNextRecurrenceDate,
  getNextWeeklyOccurrence,
  getNextMonthlyOccurrence,
  filterInstancesByDateRange,
  getCalendarEventsFromTasks
};
