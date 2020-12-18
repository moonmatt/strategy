const globObj = {};

module.exports = input => {
	return Array(input.length).fill({}).map((item, index) => {
		globObj[input[index].path] = { path: input[index].path, users: [] };
		return (req, res, next) => {
			if(req.path === input[index].path){
				const alreadyDoneRequests = globObj[input[index].path].users.filter(item => item.IP === req.ip && Date.now() - item.timestamp <= input[index].timeout);
				if(alreadyDoneRequests.length > input[index].max){
					if(typeof input[index].deny === 'function')
						input[index].deny(req, res);
					else{
						res.status(429);
						res.send(typeof input[index].deny === 'object' ? JSON.stringify(input[index].deny) : input[index].deny);
					}
					if(input[index].force !== false)
						globObj[input[index].path].users.push({ IP: req.ip, timestamp: Date.now() });
				}
				else{
					globObj[input[index].path].users.push({ IP: req.ip, timestamp: Date.now() });
					next();
				}
			}
		}
	});
};