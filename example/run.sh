#!/usr/bin/env sh

DIR=$(dirname $(readlink -f $0))

for example in \
    main \
    simple
do
    echo "Generating ${example} example"
    npx synku "${DIR}/${example}.ts" > "${DIR}/${example}.yaml"
done
