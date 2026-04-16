@echo off
chcp 65001 > nul

set MONGOIMPORT="c:\Program Files\MongoDB\Server\8.2\bin\mongoimport.exe"
set URI=mongodb+srv://forkfeeduser:forkfeed@forkfeed.kridmu5.mongodb.net/
set DB=ForkFeed

echo === ForkFeed - adatbazis feltoltes ===
echo.

echo Importalas MongoDB-be...
echo.

%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=users               --drop --file="%~dp0users.json"               --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=categories          --drop --file="%~dp0categories.json"          --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=tags                --drop --file="%~dp0tags.json"                --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=recipes             --drop --file="%~dp0recipes.json"             --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=ingredients         --drop --file="%~dp0ingredients.json"         --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=steps               --drop --file="%~dp0steps.json"               --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=recipe_categories   --drop --file="%~dp0recipe_categories.json"   --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=recipe_tags         --drop --file="%~dp0recipe_tags.json"         --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=recipe_books        --drop --file="%~dp0recipe_books.json"        --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=recipe_book_recipes --drop --file="%~dp0recipe_book_recipes.json" --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=comments            --drop --file="%~dp0comments.json"            --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=ratings             --drop --file="%~dp0ratings.json"             --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=favorites           --drop --file="%~dp0favorites.json"           --jsonArray
%MONGOIMPORT% --uri=%URI% --db=%DB% --collection=reports             --drop --file="%~dp0reports.json"             --jsonArray

echo.
echo === Import kesz! ===
echo.
echo Példa felhasználók:
echo   _id 1  admin          (admin@forkfeed.com)          role: admin  pw: admin1234
echo   _id 2  chefmari       (mari@example.com)             role: user   pw: password123
echo   _id 3  kovacsistvan   (kovacs.istvan@example.com)    role: user   pw: password123
echo   _id 4  nagyaniko      (nagy.aniko@example.com)       role: user   pw: password123
echo   _id 5  budapestitamas (tamas.bp@example.com)         role: user   pw: password123
echo.
echo INDÍTSD ÚJRA A DEV SZERVERT ha fut!
echo.
pause
