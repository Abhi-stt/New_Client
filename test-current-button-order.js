console.log('🧪 Current Button Order in Task Details Dialog...\n');

console.log('📋 Current Button Layout:');
console.log('1. [Reassign Task] - LEFT (for managers only)');
console.log('2. [Update Status] - RIGHT (for all users)');

console.log('\n✅ What Should Happen Now:');
console.log('- Managers see: [Reassign Task] [Update Status]');
console.log('- Other users see: [Update Status]');
console.log('- Reassign button appears FIRST (left side)');
console.log('- Update Status button appears SECOND (right side)');

console.log('\n🔧 If you still see wrong order:');
console.log('1. Clear browser cache');
console.log('2. Hard refresh the page (Ctrl+F5)');
console.log('3. Check browser console for any errors');
console.log('4. Verify the file was saved properly');

console.log('\n🧪 To test:');
console.log('1. Login as Manager');
console.log('2. Open task details for a task assigned to you');
console.log('3. Look at the bottom of the dialog');
console.log('4. Should see "Reassign Task" button on the LEFT');
console.log('5. Should see "Update Status" button on the RIGHT');

console.log('\n📁 File location: components/task-management.tsx');
console.log('🔍 Look for: "Action Buttons" section around line 580-620');
