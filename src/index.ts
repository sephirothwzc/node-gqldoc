import Docxtemplater from 'docxtemplater';
import { DATA_SCHEMA } from './data/data-schema';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { startsWith } from 'lodash';

const getTypeName = (x: {
  kind: string;
  name: string;
  ofType: {
    kind: string;
    name: string;
    ofType: any;
  };
}) => {
  if (x.name) {
    return x.name;
  }
  if (x.name === null) {
    if (x.kind === 'LIST') {
      return `List<${x.ofType?.name || x.ofType.ofType?.name || x.ofType.ofType.ofType.name}>`;
    } else if (x.kind === 'NON_NULL') {
      if (x.ofType.name) {
        return x.ofType.name;
      } else if (x.ofType.kind === 'LIST') {
        return `List<${x.ofType?.ofType?.name || x.ofType.ofType?.ofType?.name}>`;
      }
    }
  }
  return '';
};

/**
 * main
 */
const main = () => {
  // console.log(DATA_SCHEMA);
  const content = fs.readFileSync(path.resolve(__dirname, 'data/table.docx'), 'binary');
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const viewObject = {
    types: DATA_SCHEMA.types
      .filter(
        (p) => p.fields && !startsWith(p.name, '_') && !['Query', 'Mutation'].includes(p.name)
      )
      .map((p, index) => {
        return {
          no: index + 1,
          name: p.name,
          description: p.description || '',
          fields: p.fields?.map((x) => ({
            name: x.name,
            typeName: getTypeName(x.type as any),
            fieldDescription: x.description || '',
            nonNull: x.type.kind === 'NON_NULL' ? '是' : '',
          })),
        };
      }),
    inputTypes: DATA_SCHEMA.types
      .filter(
        (p) => p.inputFields && !startsWith(p.name, '_') && !['Query', 'Mutation'].includes(p.name)
      )
      .map((p, index) => {
        return {
          no: index + 1,
          name: p.name,
          description: p.description || '',
          fields: p.inputFields?.map((x) => ({
            name: x.name,
            typeName: getTypeName(x.type as any),
            fieldDescription: x.description || '',
            nonNull: x.type.kind === 'NON_NULL' ? '是' : '',
          })),
        };
      }),
    query: DATA_SCHEMA.types
      .find((p) => p.name === 'Query')
      ?.fields?.map((p, index) => ({
        name: p.name,
        no: index + 1,
        description: p.description,
        outPutName: p.type.name || p.type.ofType?.name,
        outPutTypeName: getTypeName(p.type as any),
        outPutDescription: p.deprecationReason || '',
        outPutNonNull: p.type.kind === 'NON_NULL' ? '是' : '',
        arg: p.args.map((x) => ({
          name: x.name,
          typeName: getTypeName(x.type as any),
          argDescription: x.description || '',
          nonNull: x.type.kind === 'NON_NULL' ? '是' : '',
        })),
      })),
    mutation: DATA_SCHEMA.types
      .find((p) => p.name === 'Mutation')
      ?.fields?.map((p, index) => ({
        name: p.name,
        no: index + 1,
        description: p.description,
        outPutName: p.type.name || p.type.ofType?.name,
        outPutTypeName: getTypeName(p.type as any),
        outPutDescription: p.deprecationReason || '',
        outPutNonNull: p.type.kind === 'NON_NULL' ? '是' : '',
        arg: p.args.map((x) => ({
          name: x.name,
          typeName: getTypeName(x.type as any),
          argDescription: x.description || '',
          nonNull: x.type.kind === 'NON_NULL' ? '是' : '',
        })),
      })),
  };

  // Render the document (Replace {first_name} by John, {last_name} by Doe, ...)
  doc.render(viewObject);

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    // compression: DEFLATE adds a compression step.
    // For a 50MB output document, expect 500ms additional CPU time
    compression: 'DEFLATE',
  });

  // buf is a nodejs Buffer, you can either write it to a
  // file or res.send it with express for example.
  fs.writeFileSync(path.resolve(__dirname, 'output.docx'), buf);

  process.exit();
};

main();
