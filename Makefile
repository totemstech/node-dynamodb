unit:
	node test/unit.toDDB.js

integration:
	node test/integration.item.js

test: unit integration

.PHONY: test
