# Levaro Tracker — Netlify Deploy
# Run this from PowerShell inside C:\Users\aadhi\Documents\Projects\levaro-tracker
#
# OPTION 1: Fresh MCP token (use within a few minutes — token expires quickly)
npx -y @netlify/mcp@latest --site-id 5233958e-f16b-4127-97de-e8878d84e67c --proxy-path "https://netlify-mcp.netlify.app/proxy/eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..ajTEQyWm_Sq2PZLr.owqtphxtW5fmPWx0GGQL_2Pktltli5breU0aYIUOzCEaJVfbtSm8Lu49YnclkF0Zdni72_RP1Qrx6Zv84mvbPFacs9cN2tErAn2ME4pos9-ZLQhFsKxD5mcukvg5eMoJwYbpW8o2inyqiNWL9KnN_N36YdVZ-e-VD0fauxjq8YAMNfS1DUcU9xM6-dbmyNn5t37UsFvpwbzp52PPdWaNBNkcoZYwdj7Be0SFD3dQzbye2hekWwCQycV900dvatUOi1SPZH08Cawx8S1cD0XVD-QGBX2C0eN9PL3XJPpN1a2-6Lgc5OP0Z0RIAWy2ofQOy-AWqoqPKMMyQWqxdk3PK2gLb0dxvGNDtoM3x3GxmxnEyrfx6A.7PCgpCspUNacVKKWrRRvdA"
#
# OPTION 2: If token above has expired, log in first then run:
#   npx netlify-cli login
#   npm run build
#   npx netlify-cli deploy --prod --dir dist --site 5233958e-f16b-4127-97de-e8878d84e67c
