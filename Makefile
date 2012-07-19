unit:
	node test/unit.toDDB.js

integration:
	node test/integration.item.js

batch:
	node test/batch.js

test: unit integration batch

.PHONY: test
