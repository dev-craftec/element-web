#!/bin/bash

# Path to the components.json file
JSON_FILE="components.json"

# Parse the JSON and iterate over key-value pairs
jq -r 'to_entries[] | "\(.key) \(.value)"' $JSON_FILE | while read key value; do
    # Prepend the path to the key
    src="node_modules/matrix-react-sdk/$key"
    dst="./$value"

    # Check if the source file exists
    if [ -f "$src" ]; then
        # Create target directory if it doesn't exist
        mkdir -p "$(dirname "$dst")"

        # Copy the file from src to dst
        cp "$src" "$dst"
        echo "Copied $src to $dst"
    else
        echo "Source file $src not found!"
    fi
done
