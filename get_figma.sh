curl -sH 'X-Figma-Token: figd_z9NUzU5EAiOGGvLsmx3cPl8Nq1mNpPQY7nr7NKWh' 'https://api.figma.com/v1/files/e2Tt8ZJnyQj7AlMGhAQQ8M' | python3 -m json.tool > figma.json
curl -H 'X-FIGMA-TOKEN: figd_z9NUzU5EAiOGGvLsmx3cPl8Nq1mNpPQY7nr7NKWh' 'https://api.figma.com/v1/files/e2Tt8ZJnyQj7AlMGhAQQ8M/images' | python3 -m json.tool > figma_files.json
./figmaToTemplate.js
