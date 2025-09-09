console.log('🔍 Debugging Reassign Button Issue...\n');

console.log('🔧 Current Implementation:');
console.log('1. Reassign button shows in task cards');
console.log('2. Reassign button shows in task details dialog');
console.log('3. Logic: user?.role === "manager" && (task.assigneeId?.id === user?.id || task.assigneeId === user?.id)');

console.log('\n❓ Potential Issues:');
console.log('1. User role not being set correctly');
console.log('2. AssigneeId structure mismatch');
console.log('3. Task status already completed/approved');
console.log('4. Backend data not populated correctly');

console.log('\n🧪 Debug Steps:');
console.log('1. Check browser console for debug info');
console.log('2. Verify user role is "manager"');
console.log('3. Check assigneeId structure in task data');
console.log('4. Ensure task status is not completed/approved');

console.log('\n📋 Expected Data Structure:');
console.log('User: { id: "123", role: "manager" }');
console.log('Task: { assigneeId: "123" } OR { assigneeId: { id: "123", name: "Manager Name" } }');

console.log('\n🎯 To Test:');
console.log('1. Login as Manager');
console.log('2. Look for debug info in task cards');
console.log('3. Check if reassign button appears');
console.log('4. Try opening task details to see reassign button there');
