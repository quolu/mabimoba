# Discord APIの一次資料抜粋

出典：Discord公式discord-api-docs。取得日：2026-10-08。確度：公式原文。


原文：https://github.com/discord/discord-api-docs/blob/main/developers/resources/webhook.mdx

## Execute Webhook
<Route method="POST">/webhooks/[\{webhook.id\}](/developers/resources/webhook#webhook-object)/[\{webhook.token\}](/developers/resources/webhook#webhook-object)</Route>

Refer to [Uploading Files](/developers/reference#uploading-files) for details on attachments and `multipart/form-data` requests. Returns a message or `204 No Content` depending on the `wait` query parameter.

<Info>
Note that when sending a message, you must provide a value for at **least one of** `content`, `embeds`, `components`, `file`, or `poll`.
</Info>

<Info>
If the webhook channel is a forum or media channel, you must provide either `thread_id` in the query string params, or `thread_name` in the JSON/form params. If `thread_id` is provided, the message will send in that thread. If `thread_name` is provided, a thread with that name will be created in the channel.
</Info>

<Warning>
Discord may strip certain characters from message content, like invalid unicode characters or characters which cause unexpected message formatting. If you are passing user-generated strings into message content, consider sanitizing the data to prevent unexpected behavior and using `allowed_mentions` to prevent unexpected mentions.
</Warning>

<ManualAnchor id="execute-webhook-query-string-params" />
###### Query String Params

| Field           | Type                                                   | Description                                                                                                                                                                                                     | Required |
|-----------------|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| wait            | [boolean](/developers/reference#boolean-query-strings) | waits for server confirmation of message send before response, and returns the created message body (defaults to `false`; when `false` a message that is not saved does not return an error)                    | false    |
| thread_id       | snowflake                                              | Send a message to the specified thread within a webhook's channel. The thread will automatically be unarchived.                                                                                                 | false    |
| with_components | [boolean](/developers/reference#boolean-query-strings) | whether to respect the `components` field of the request. When enabled, allows application-owned webhooks to use all components and non-owned webhooks to use non-interactive components. (defaults to `false`) | false    |

<ManualAnchor id="execute-webhook-json/form-params" />
###### JSON/Form Params

| Field             | Type                                                                                                                        | Description                                                                                                                                                                                                                        | Required                           |
|-------------------|-----------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------|
| content           | string                                                                                                                      | the message contents (up to 2000 characters)                                                                                                                                                                                       | one of content, file, embeds, poll |
| username          | string                                                                                                                      | override the default username of the webhook                                                                                                                                                                                       | false                              |
| avatar_url        | string                                                                                                                      | override the default avatar of the webhook                                                                                                                                                                                         | false                              |
| tts               | boolean                                                                                                                     | true if this is a TTS message                                                                                                                                                                                                      | false                              |
| embeds            | array of up to 10 [embed](/developers/resources/message#embed-object) objects                                               | embedded `rich` content                                                                                                                                                                                                            | one of content, file, embeds, poll |
| allowed_mentions  | [allowed mention object](/developers/resources/message#allowed-mentions-object)                                             | allowed mentions for the message                                                                                                                                                                                                   | false                              |
| components \*     | array of [message component](/developers/components/reference#component-object)                                             | the components to include with the message                                                                                                                                                                                         | false                              |
| files[n] \*\*     | file contents                                                                                                               | the contents of the file being sent                                                                                                                                                                                                | one of content, file, embeds, poll |
| payload_json \*\* | string                                                                                                                      | JSON encoded body of non-file params                                                                                                                                                                                               | `multipart/form-data` only         |
| attachments \*\*  | array of partial [attachment request](/developers/resources/message#attachment-object-attachment-request-structure) objects | metadata for the attachments                                                                                                                                                                                                       | false                              |
| flags \*\*\*      | integer                                                                                                                     | [message flags](/developers/resources/message#message-object-message-flags) combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) (only `SUPPRESS_EMBEDS`, `SUPPRESS_NOTIFICATIONS` and `IS_COMPONENTS_V2` can be set) | false                              |
| thread_name       | string                                                                                                                      | name of thread to create (requires the webhook channel to be a forum or media channel)                                                                                                                                             | false                              |
| applied_tags      | array of snowflakes                                                                                                         | array of tag ids to apply to the thread (requires the webhook channel to be a forum or media channel)                                                                                                                              | false                              |
| poll              | [poll](/developers/resources/poll#poll-create-request-object) request object                                                | A poll!                                                                                                                                                                                                                            | one of content, file, embeds, poll |

\* Application-owned webhooks can always send components. Non-application-owned webhooks cannot send interactive components, and the `components` field will be ignored unless they set the `with_components` query param.

\*\* See [Uploading Files](/developers/reference#uploading-files) for details.

\*\*\* When the flag `IS_COMPONENTS_V2` is set, the webhook message can only contain `components`. Providing `content`, `embeds`, `files[n]` or `poll` will fail with a 400 BAD REQUEST response.

<Info>
For the webhook embed objects, you can set every field except `type` (it will be `rich` regardless of if you try to set it), `provider`, `video`, and any `height`, `width`, or `proxy_url` values for images.
</Info>


原文：https://github.com/discord/discord-api-docs/blob/main/developers/resources/message.mdx

###### Embed Limits

To facilitate showing rich content, rich embeds do not follow the traditional limits of message content. However, some limits are still in place to prevent excessively large embeds. The following table describes the limits:

All of the following limits are measured inclusively. Leading and trailing whitespace characters are not included (they are trimmed automatically).

| Field                                                                            | Limit                                                                                      |
|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| title                                                                            | 256 characters                                                                             |
| description                                                                      | 4096 characters                                                                            |
| fields                                                                           | Up to 25 [field](/developers/resources/message#embed-object-embed-field-structure) objects |
| [field.name](/developers/resources/message#embed-object-embed-field-structure)   | 256 characters                                                                             |
| [field.value](/developers/resources/message#embed-object-embed-field-structure)  | 1024 characters                                                                            |
| [footer.text](/developers/resources/message#embed-object-embed-footer-structure) | 2048 characters                                                                            |
| [author.name](/developers/resources/message#embed-object-embed-author-structure) | 256 characters                                                                             |

Additionally, the combined sum of characters in all `title`, `description`, `field.name`, `field.value`, `footer.text`, and `author.name` fields across all embeds attached to a message must not exceed 6000 characters. Violating any of these constraints will result in a `Bad Request` response.

Embeds are deduplicated by URL.  If a message contains multiple embeds with the same URL, only the first is shown.

#### Embed Fields by Embed Type

Certain embed types are used to power special UIs. These embeds use [fields](/developers/resources/message#embed-object-embed-field-structure) to include additional data in key-value pairs. Below is a reference of possible embed fields for each of the following embed types.

<ManualAnchor id="embed-fields-by-embed-type-poll-result-embed-fields" />
###### Poll Result Embed Fields

| Field                         | Description                                                |
|-------------------------------|------------------------------------------------------------|
| poll_question_text            | question text from the original poll                       |
| victor_answer_votes           | number of votes for the answer(s) with the most votes      |
| total_votes                   | total number of votes in the poll                          |
| victor_answer_id?             | id for the winning answer                                  |
| victor_answer_text?           | text for the winning answer                                |
| victor_answer_emoji_id?       | id for an emoji associated with the winning answer         |
| victor_answer_emoji_name?     | name of an emoji associated with the winning answer        |
| victor_answer_emoji_animated? | if an emoji associated with the winning answer is animated |

### Attachment Object

<ManualAnchor id="attachment-object-attachment-structure" />
###### Attachment Structure

| Field                | Type                                                                 | Description                                                                                                                                            |
|----------------------|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| id                   | snowflake                                                            | attachment id                                                                                                                                          |
| filename             | string                                                               | name of file attached                                                                                                                                  |
| title?               | string                                                               | the title of the file                                                                                                                                  |
| description?         | string                                                               | description (alt text) for the file (max 1024 characters)                                                                                              |
| content_type?        | string                                                               | the attachment's [media type](https://en.wikipedia.org/wiki/Media_type)                                                                                |
| size                 | integer                                                              | size of file in bytes                                                                                                                                  |
| url                  | string                                                               | source url of file                                                                                                                                     |
| proxy_url \*         | string                                                               | a proxied url of file                                                                                                                                  |
| height?              | ?integer                                                             | height of file (if image or video)                                                                                                                     |
| width?               | ?integer                                                             | width of file (if image or video)                                                                                                                      |
| placeholder?         | string                                                               | [thumbhash](https://evanw.github.io/thumbhash/) placeholder (if image or video)                                                                        |
| placeholder_version? | integer                                                              | version of the placeholder (if image or video)                                                                                                         |
| ephemeral? \*\*      | boolean                                                              | whether this attachment is ephemeral                                                                                                                   |
| duration_secs?       | float                                                                | the duration of the audio or video file                                                                                                                |
| waveform?            | string                                                               | base64 encoded bytearray representing a sampled waveform (currently for voice messages)                                                                |
| flags?               | integer                                                              | [attachment flags](/developers/resources/message#attachment-object-attachment-flags) combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) |
| clip_participants?   | array of [user](/developers/resources/user#user-object) objects      | for Clips, array of users who were in the stream                                                                                                       |
| clip_created_at?     | ISO8601 timestamp                                                    | for Clips, when the clip was created                                                                                                                   |
| application?         | ?[application](/developers/resources/application#application-object) | for Clips, the application in the stream, if recognized                                                                                                |

\* The proxy url supports images and videos (which have a defined `width` and `height`) as well as audio files, which are passed through unmodified. For all other attachment types, the proxy returns a `415: Unsupported Media Type` error.

\*\* Ephemeral attachments will automatically be removed after a set period of time. Ephemeral attachments on messages are guaranteed to be available as long as the message itself exists.

<ManualAnchor id="attachment-object-attachment-request-structure" />
###### Attachment Request Structure

This structure is used in Message Create and Edit requests to set which attachments are in the message and provide their metadata.

When editing, you must provide the `id` of each file to keep, and you can optionally update the `description` and `is_spoiler` fields of existing attachments.

| Field          | Type                | Description                                                                                                                |
|----------------|---------------------|----------------------------------------------------------------------------------------------------------------------------|
| id             | snowflake or number | attachment id, for new attachments this must match the `n` in `files[n]`                                                   |
| filename?      | string              | name of file attached                                                                                                      |
| title?         | string              | the title of the file                                                                                                      |
| description?   | string              | description (alt text) for the file (max 1024 characters)                                                                  |
| duration_secs? | float               | the duration of the audio or video file (required for voice messages)                                                      |
| waveform?      | string              | base64 encoded bytearray representing a sampled waveform (required for voice messages)                                     |
| is_spoiler?    | boolean             | whether the attachment should be marked as a spoiler and blurred until clicked, this sets the `IS_SPOILER` attachment flag |

<ManualAnchor id="attachment-object-attachment-flags" />
###### Attachment Flags

| Flag         | Value    | Description                                                                                                   |
|--------------|----------|---------------------------------------------------------------------------------------------------------------|
| IS_CLIP      | `1 << 0` | this attachment is a [Clip from a stream](https://support.discord.com/hc/en-us/articles/16861982215703)       |
| IS_THUMBNAIL | `1 << 1` | this attachment is the thumbnail of a thread in a media channel, displayed in the grid but not on the message |
| IS_REMIX     | `1 << 2` | this attachment has been edited using the remix feature on mobile (deprecated)                                |
| IS_SPOILER   | `1 << 3` | this attachment was marked as a spoiler and is blurred until clicked                                          |
| IS_ANIMATED  | `1 << 5` | this attachment is an animated image                                                                          |

### Channel Mention Object

<ManualAnchor id="channel-mention-object-channel-mention-structure" />
###### Channel Mention Structure

| Field    | Type      | Description                                                                       |
|----------|-----------|-----------------------------------------------------------------------------------|
| id       | snowflake | id of the channel                                                                 |
| guild_id | snowflake | id of the guild containing the channel                                            |
| type     | integer   | the [type of channel](/developers/resources/channel#channel-object-channel-types) |
| name     | string    | the name of the channel                                                           |

### Allowed Mentions Object

Setting the `allowed_mentions` field lets you determine whether users will receive notifications when you include mentions in the message content, or the content of components attached to that message. This field is always validated against your permissions and the presence of said mentions in the message, to avoid "phantom" pings where users receive a notification without a visible mention in the message. For example, if you want to ping everyone, including it in the `allowed_mentions` field is not enough, the mention format (`@everyone`) must also be present in the content of the message or its components. It is important to note that setting this field **does not** guarantee a push notification will be sent, as additional factors can influence this:

- To mention roles and notify their members, the role's `mentionable` field must be set to `true`, or the bot must have the `MENTION_EVERYONE` permission
- To mention `@everyone` and `@here`, the bot must have the `MENTION_EVERYONE` permission
- Setting the `SUPPRESS_NOTIFICATIONS` flag when sending a message will disable push notifications and only cause a notification badge
- Users can customize their notification settings through the Discord app, which might cause them to only receive a notification badge and no push notification


<ManualAnchor id="allowed-mentions-object-allowed-mention-types" />
###### Allowed Mention Types

| Type              | Value      | Description                           |
|-------------------|------------|---------------------------------------|
| Role Mentions     | "roles"    | Controls role mentions                |
| User Mentions     | "users"    | Controls user mentions                |
| Everyone Mentions | "everyone" | Controls @everyone and @here mentions |

<ManualAnchor id="allowed-mentions-object-default-settings-for-allowed-mentions" />
###### Default Settings for Allowed Mentions

The default value for the `allowed_mentions` field, used when it is not passed in the body, varies depending on the context:

In **regular messages**, all mention types are parsed, which is equivalent to sending the following data:

```json
{
  "parse": ["users", "roles", "everyone"]
}
```

In **interactions** and **webhooks**, only user mentions are parsed, which corresponds to the following:

```json
{
  "parse": ["users"]
}
```

| Field         | Type                           | Description                                                                                                                                |
|---------------|--------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| parse?        | array of allowed mention types | An array of [allowed mention types](/developers/resources/message#allowed-mentions-object-allowed-mention-types) to parse from the content |
| roles?        | array of snowflakes            | Array of role ids to mention, max 100                                                                                                      |
| users?        | array of snowflakes            | Array of user ids to mention, max 100                                                                                                      |
| replied_user? | boolean                        | For replies, whether to mention the author of the message being replied to, defaults to false                                              |

<ManualAnchor id="allowed-mentions-object-allowed-mentions-examples" />
###### Allowed Mentions Examples

Because the behavior of the `allowed_mentions` field is more complex than it seems, here's a set of examples:


In the following case, we are sending a regular message **without** configuring `allowed_mentions`. As a result, all included mentions will be parsed.

```json
{
  "content": "@here Hello <@&1234> and <@5678> 👋"
}
```

If you want to completely suppress all mentions in the message, you can configure the `allowed_mentions` field as we've documented above:

```json
{
  "content": "@here Hello <@&1234> and <@5678> 👋",
  "allowed_mentions": {
    "parse": []
  }
}
```


It is important to note that the `parse` field is **mutually exclusive** with the other fields. In the example below, only the `1234` role and the `5678` user mentions would be parsed, but **not** the `@here` at the beginning. Passing a falsy value such as `null` or an empty array into the `users` field does not trigger a validation error.

```json
{
  "content": "@here Hello <@&1234> and <@5678> 👋",
  "allowed_mentions": {
    "parse": ["users", "roles"],
    "users": []
  }
}
```


In this next example, **only** `@everyone` would be parsed, as well as users `1234` and `5678` in case they suppressed `@everyone` mentions in their settings.

```json
{
  "content": "@everyone <@1234> <@5678> <@&789> 👋",
  "allowed_mentions": {
    "parse": ["everyone"],
    "users": ["1234", "5678"]
  }
}
```


Due to possible ambiguities, not all configurations are accepted. Here's an example of an *invalid* configuration, because it includes both `parse` and `users`, despite those fields being mutually exclusive, causing a validation error.

```json
{
  "content": "@everyone <@1234> <@5678> <@9012> <@&200>",
  "allowed_mentions": {
    "parse": ["users"],
    "users": ["1234", "5678"]
  }
}
```

Any entities whose id is included can be mentioned. Do note the API will silently ignore entities whose id are present in the `allowed_mentions` field, but not in the content of the message or its components. For example, in the following configuration, the user 123 mention would be parsed because it is present in the `content`. However, since there is no mention of user 456 in the `content`, they would not be notified.

```json
{
  "content": "<@123> Time for some memes 🤠",
  "allowed_mentions": {
    "users": ["123", "456"]
  }
}
```

### Role Subscription Data Object

<ManualAnchor id="role-subscription-data-object-role-subscription-data-object-structure" />
###### Role Subscription Data Object Structure

| Field                        | Type      | Description                                                           |
|------------------------------|-----------|-----------------------------------------------------------------------|
| role_subscription_listing_id | snowflake | the id of the sku and listing that the user is subscribed to          |
| tier_name                    | string    | the name of the tier that the user is subscribed to                   |
| total_months_subscribed      | integer   | the cumulative number of months that the user has been subscribed for |
| is_renewal                   | boolean   | whether this notification is for a renewal rather than a new purchase |

### Message Pin Object

<ManualAnchor id="message-pin-object-message-pin-object-structure" />
###### Message Pin Object Structure

| Field     | Type                                                           | Description                     |
|-----------|----------------------------------------------------------------|---------------------------------|
| pinned_at | ISO8601 timestamp                                              | the time the message was pinned |
| message   | [message](/developers/resources/message#message-object) object | the pinned message              |

### Shared Client Theme Object

<ManualAnchor id="shared-client-theme-object-shared-client-theme-object-structure" />
###### Shared Client Theme Object Structure

| Field          | Type                                                          | Description                                            |
|----------------|---------------------------------------------------------------|--------------------------------------------------------|
| colors         | array of strings                                              | the hexadecimal-encoded colors of the theme (max of 5) |
| gradient_angle | integer                                                       | the direction of the theme's colors (max of 360)       |
| base_mix       | integer                                                       | the intensity of the theme's colors (max of 100)       |
| base_theme?    | ?[base theme](/developers/resources/message#base-theme-types) | the mode of the theme                                  |

<ManualAnchor id="base-theme-types" />
###### Base Theme Types

| Type        | Value |
|-------------|-------|
| UNSET \[1\] | 0     |
| DARK        | 1     |
| LIGHT       | 2     |
| DARKER      | 3     |
| MIDNIGHT    | 4     |

\[1\] Equivalent to the `DARK` type.

<ManualAnchor id="example-shared-client-theme" />
###### Example Shared Client Theme

```json
{
  "shared_client_theme": {
    "colors": ["5865F2", "7258F2", "9858F2", "BE58F2", "E558F2"],
    "gradient_angle": 0,
    "base_mix": 58,
    "base_theme": 1
  }
}
```

## Create Message
<Route method="POST">/channels/[\{channel.id\}](/developers/resources/channel#channel-object)/messages</Route>

<Warning>
Discord may strip certain characters from message content, like invalid unicode characters or characters which cause unexpected message formatting. If you are passing user-generated strings into message content, consider sanitizing the data to prevent unexpected behavior and using `allowed_mentions` to prevent unexpected mentions.
</Warning>

Post a message to a guild text or DM channel. Returns a [message](/developers/resources/message#message-object) object. Fires a [Message Create](/developers/events/gateway-events#message-create) Gateway event. See [message formatting](/developers/reference#message-formatting) for more information on how to properly format messages.

To create a message as a reply or forward of another message, apps can include a [`message_reference`](/developers/resources/message#message-reference-structure).
Refer to the documentation for required fields.

Files must be attached using a `multipart/form-data` body as described in [Uploading Files](/developers/reference#uploading-files).

<ManualAnchor id="create-message-limitations" />
###### Limitations

- When operating on a guild channel, the current user must have the `SEND_MESSAGES` permission.
- When sending a message with `tts` (text-to-speech) set to `true`, the current user must have the `SEND_TTS_MESSAGES` permission.
- When creating a message as a reply to another message, the current user must have the `READ_MESSAGE_HISTORY` permission.
    - The referenced message must exist and cannot be a system message.
- The maximum request size when sending a message is **25 MiB**
- For the embed object, you can set every field except `type` (it will be `rich` regardless of if you try to set it), `provider`, `video`, and any `height`, `width`, or `proxy_url` values for images.

<ManualAnchor id="create-message-json/form-params" />
###### JSON/Form Params

| Field                | Type                                                                                                                        | Description                                                                                                                                                                                                                                             |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| content?\*           | string                                                                                                                      | Message contents (up to 2000 characters)                                                                                                                                                                                                                |
| nonce?               | integer or string                                                                                                           | Can be used to verify a message was sent (up to 25 characters). Value will appear in the [Message Create event](/developers/events/gateway-events#message-create).                                                                                      |
| tts?                 | boolean                                                                                                                     | `true` if this is a TTS message                                                                                                                                                                                                                         |
| embeds?\*            | array of [embed](/developers/resources/message#embed-object) objects                                                        | Up to 10 `rich` embeds (up to 6000 characters)                                                                                                                                                                                                          |
| allowed_mentions?    | [allowed mention object](/developers/resources/message#allowed-mentions-object)                                             | Allowed mentions for the message                                                                                                                                                                                                                        |
| message_reference?\* | [message reference](/developers/resources/message#message-reference-structure)                                              | Include to make your message a reply or a forward                                                                                                                                                                                                       |
| components?\*        | array of [message component](/developers/components/reference#component-object) objects                                     | Components to include with the message                                                                                                                                                                                                                  |
| sticker_ids?\*       | array of snowflakes                                                                                                         | IDs of up to 3 [stickers](/developers/resources/sticker#sticker-object) in the server to send in the message                                                                                                                                            |
| files[n]?\*          | file contents                                                                                                               | Contents of the file being sent. See [Uploading Files](/developers/reference#uploading-files)                                                                                                                                                           |
| payload_json?        | string                                                                                                                      | JSON-encoded body of non-file params, only for `multipart/form-data` requests. See [Uploading Files](/developers/reference#uploading-files)                                                                                                             |
| attachments?         | array of partial [attachment request](/developers/resources/message#attachment-object-attachment-request-structure) objects | Metadata for the attachments. See [Uploading Files](/developers/reference#uploading-files)                                                                                                                                                              |
| flags?\*\*           | integer                                                                                                                     | [Message flags](/developers/resources/message#message-object-message-flags) combined as a [bitfield](https://en.wikipedia.org/wiki/Bit_field) (only `SUPPRESS_EMBEDS`, `SUPPRESS_NOTIFICATIONS`, `IS_VOICE_MESSAGE`, and `IS_COMPONENTS_V2` can be set) |
| enforce_nonce?       | boolean                                                                                                                     | If true and nonce is present, it will be checked for uniqueness in the past few minutes. If another message was created by the same author with the same nonce, that message will be returned and no new message will be created.                       |
| poll?                | [poll](/developers/resources/poll#poll-create-request-object) request object                                                | A poll!                                                                                                                                                                                                                                                 |
| shared_client_theme? | [shared client theme object](/developers/resources/message#shared-client-theme-object)                                      | The custom client-side theme to share via the message                                                                                                                                                                                                   |

\* At least one of `content`, `embeds`, `sticker_ids`, `components`, `files[n]`, `poll`, or `shared_client_theme` is required. When forwarding a message, only `message_reference` is required.

\*\* When the flag `IS_COMPONENTS_V2` is set, the message can only contain `components`. Providing `content`, `embeds`, `sticker_ids`, `poll`, or `shared_client_theme` will fail with a 400 BAD REQUEST response.

<ManualAnchor id="create-message-example-request-body-application/json" />
###### Example Request Body (application/json)

```json
{
  "content": "Hello, World!",
  "tts": false,
  "embeds": [{
    "title": "Hello, Embed!",
    "description": "This is an embedded message."
  }]
}
```

Examples for file uploads are available in [Uploading Files](/developers/reference#uploading-files).

## Get Channel Messages
<Route method="GET">/channels/[\{channel.id\}](/developers/resources/channel#channel-object)/messages</Route>

Retrieves the messages in a channel. Returns an array of [message](/developers/resources/message#message-object) objects from newest to oldest on success.

If operating on a guild channel, this endpoint requires the current user to have the `VIEW_CHANNEL` permission. If the channel is a voice channel, they must _also_ have the `CONNECT` permission.

If the current user is missing the `READ_MESSAGE_HISTORY` permission in the channel, then no messages will be returned.

<Info>
The `before`, `after`, and `around` parameters are mutually exclusive, only one may be passed at a time.
</Info>

<ManualAnchor id="get-channel-messages-query-string-params" />
###### Query String Params

| Field   | Type      | Description                              | Default |
|---------|-----------|------------------------------------------|---------|
| around? | snowflake | Get messages around this message ID      | absent  |
| before? | snowflake | Get messages before this message ID      | absent  |
| after?  | snowflake | Get messages after this message ID       | absent  |
| limit?  | integer   | Max number of messages to return (1-100) | 50      |
