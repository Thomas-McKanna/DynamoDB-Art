import boto3
import simplejson as json

from boto3.dynamodb.types import TypeSerializer, TypeDeserializer


def get_response(status, body=None):
    response = {
        "statusCode": status,
        "headers": {
            "access-control-allow-origin": "*"
        }
    }
    
    if body:
        response["body"] = json.dumps(body)
    
    return response


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    serializer = TypeSerializer()
    body = json.loads(event["body"])
    
    try:
        drawing_id = body["id"]
    except KeyError:
        return get_response(
            status=400,
            body="Request must contain keys for 'id'"
        )
    
    try:
        response = dynamodb.get_item(
            TableName="drawings_metadata",
            Key={
                "id": serializer.serialize(drawing_id)
            }
        )
    except Exception as e:
        return get_response(status=500, body=str(e))

    if "Item" not in response:
        return get_response(status=404)

    try:
        deserializer = TypeDeserializer()
        stroke_count = deserializer.deserialize(response["Item"]["stroke_count"])
        stroke_count = int(stroke_count)
    except Exception as e:
        return get_response(status=500, body=str(e))

    try:
        response = dynamodb.delete_item(
            TableName="drawings_metadata",
            Key={
                "id": serializer.serialize(drawing_id)
            }
        )
    except Exception as e:
        return get_response(status=500, body=str(e))

    try:
        for i in range(0, stroke_count, 25):
            response = dynamodb.batch_write_item(
                RequestItems={
                    "drawings": [
                        {
                            "DeleteRequest": {
                                "Key": {
                                    "id": serializer.serialize(drawing_id),
                                    "stroke_num": serializer.serialize(j)
                                }
                            }
                        } 
                        for j in range(i, min(i + 25, stroke_count))
                    ]
                }
            )
    except Exception as e:
        traceback.print_exc()
        return get_response(status=500, body=str(e))

    return get_response(status=204)
