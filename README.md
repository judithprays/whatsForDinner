# whatsForDinner

A minimal personal dinner planner built with plain HTML, CSS, JavaScript, and Supabase.

## MVP scope

- Personal recipe collection, including a "Recipes to Try" flag
- Weekly dinner menu
- Shopping list generated from the week's recipes
- Check off ingredients you already have and print only what you still need
- Saved weekly menus / dinner history

Not in the first version: friends/feed, public sharing, comments, social features, photo uploads, automated nutrition or cost calculations, or advanced ingredient quantity consolidation.


## Important MVP notes

- Ingredients are currently one text line per ingredient. The shopping list combines exact duplicate lines, but does not yet understand equivalent quantities (for example, "1 onion" and "2 onions").
- Recipe photo is currently an optional image URL, not an upload. Add Supabase Storage upload only after the core workflow works.
- Ratings are personal estimates, not health or nutrition calculations.
- Menu history stores each saved weekly plan. Save after changing a previous week to preserve the changes.
