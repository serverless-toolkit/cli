<script context="module" lang="ts">
  import { Request, Response } from "@serverless-toolkit/sdk";

  export const title = "HTML form submit";
  export let data = {
    fname: "",
    lname: "",
  };

  export async function load(request: Request, response: Response) {
    data = request.body || {};
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<h1>{title}</h1>

<form method="post">
  <label for="fname">First name:</label><br />
  <input type="text" id="fname" name="fname" value={data.fname} /><br />
  <label for="lname">Last name:</label><br />
  <input type="text" id="lname" name="lname" value={data.lname} /><br />
  <input type="submit" value="Submit" />
</form>

<div>
  Your input was: {data.fname}
  {data.lname}
</div>

<style>
  h1 {
    color: blue;
  }
</style>
