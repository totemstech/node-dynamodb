test:
	./node_modules/.bin/mocha -u tdd
	node test/integration.item.js

.PHONY: test
