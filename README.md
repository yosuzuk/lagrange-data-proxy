# lagrange-data-proxy

This `lagrange-data-proxy` is a [Netlify function](https://www.netlify.com/products/functions/) for loading and saving star system maps using [Rentry.co](https://rentry.co/). It can be configured as "backend" for the `lagrange data` site.

## Setup deployment

- Create a [Netlify](https://www.netlify.com/) account
- Clone this repository
- Link the cloned respository to your Netlify account
  - Go to your Netlify team overview page
  - Click "Add new site" -> "Import existing project"
  - Choose GitHub and select your cloned respository (you can ignore "Base directory", "Build command" and "Publish directory")
  - Configure a site name (e.g. "maps-for-my-union")
  - Check if it's deploying

## Creating a map on Rentry.co

- Go to [Rentry.co](https://rentry.co/)
- Enter some text (e.g. "$overlay Hello World!")
- Hit "Go" to save
- Take a note of your "edit code" (you will need this when saving maps)
- Check the URL in your adress bar and take a note of your file id (part after 'rentry.co/')

## Configure a backend URL for lagrange-data site

Your backend URL looks like this:
```
https://[your site name].netlify.app/.netlify/functions/mapFromRentryCo?map=[your Rentry.co file id]
```

Example:
```
https://maps-for-my-union.netlify.app/.netlify/functions/mapFromRentryCo?map=abc123
```

- Go to `lagrange-data` site -> "Maps" -> "Configure backend"
- Paste the URL into the URL input field
- Click "LOAD MAP"

If the page can successfully load the map, it will store the given backend URL in the browser's localStorage (you won't have to paste it again).

## Sharing maps with others

After opening your map, you can copy the map URL from your adress bar to share it with others.

The map URL will directly open your map. Your backend URL is embedded in it, so others can directly open your map without configuring a backend URL themself.

