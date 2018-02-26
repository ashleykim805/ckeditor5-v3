/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';

import { upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';

import { getData as getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';
import { setData as setModelData, getData as getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { downcastTable, downcastTableCell, upcastTable } from '../src/converters';

describe( 'Table converters', () => {
	let editor, model, viewDocument;

	beforeEach( () => {
		return VirtualTestEditor.create()
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				viewDocument = editor.editing.view;

				const conversion = editor.conversion;
				const schema = model.schema;

				schema.register( 'table', {
					allowWhere: '$block',
					allowAttributes: [ 'headingRows' ],
					isBlock: true,
					isObject: true
				} );

				schema.register( 'tableRow', {
					allowIn: 'table',
					allowAttributes: [],
					isBlock: true,
					isLimit: true
				} );

				schema.register( 'tableCell', {
					allowIn: 'tableRow',
					allowContentOf: '$block',
					allowAttributes: [ 'colspan', 'rowspan' ],
					isBlock: true,
					isLimit: true
				} );

				conversion.for( 'upcast' ).add( upcastTable() );
				conversion.for( 'downcast' ).add( downcastTable() );

				// Table row upcast only since downcast conversion is done in `downcastTable()`.
				conversion.for( 'upcast' ).add( upcastElementToElement( { model: 'tableRow', view: 'tr' } ) );

				// Table cell conversion.
				conversion.for( 'upcast' ).add( upcastElementToElement( { model: 'tableCell', view: 'td' } ) );
				conversion.for( 'upcast' ).add( upcastElementToElement( { model: 'tableCell', view: 'th' } ) );
				conversion.for( 'downcast' ).add( downcastTableCell() );
			} );
	} );

	describe( 'upcastTable()', () => {
		function expectModel( data ) {
			expect( getModelData( model, { withoutSelection: true } ) ).to.equal( data );
		}

		beforeEach( () => {
			// Since this part of test tests only view->model conversion editing pipeline is not necessary
			// so defining model->view converters won't be necessary.
			editor.editing.destroy();
		} );

		it( 'should create table model from table without thead', () => {
			editor.setData(
				'<table>' +
				'<tr><td>1</td></tr>' +
				'</table>'
			);

			expectModel(
				'<table>' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create table model from table with one thead with one row', () => {
			editor.setData(
				'<table>' +
				'<thead><tr><td>1</td></tr></thead>' +
				'</table>'
			);

			expectModel(
				'<table headingRows="1">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create table model from table with one thead with more then on row', () => {
			editor.setData(
				'<table>' +
				'<thead>' +
				'<tr><td>1</td></tr>' +
				'<tr><td>2</td></tr>' +
				'<tr><td>3</td></tr>' +
				'</thead>' +
				'</table>'
			);

			expectModel(
				'<table headingRows="3">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'<tableRow><tableCell>3</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create table model from table with two theads with one row', () => {
			editor.setData(
				'<table>' +
				'<thead><tr><td>1</td></tr></thead>' +
				'<tbody><tr><td>2</td></tr></tbody>' +
				'<thead><tr><td>3</td></tr></thead>' +
				'</table>'
			);

			expectModel(
				'<table headingRows="1">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'<tableRow><tableCell>3</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create table model from table with thead after the tbody', () => {
			editor.setData(
				'<table>' +
				'<tbody><tr><td>2</td></tr></tbody>' +
				'<thead><tr><td>1</td></tr></thead>' +
				'</table>'
			);

			expectModel(
				'<table headingRows="1">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create table model from table with one tfoot with one row', () => {
			editor.setData(
				'<table>' +
				'<tfoot><tr><td>1</td></tr></tfoot>' +
				'</table>'
			);

			expectModel(
				'<table>' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should create valid table model from empty table', () => {
			editor.setData(
				'<table>' +
				'</table>'
			);

			expectModel(
				'<table><tableRow><tableCell></tableCell></tableRow></table>'
			);
		} );

		it( 'should skip unknown table children', () => {
			editor.setData(
				'<table>' +
				'<caption>foo</caption>' +
				'<tr><td>bar</td></tr>' +
				'</table>'
			);

			expectModel(
				'<table><tableRow><tableCell>bar</tableCell></tableRow></table>'
			);
		} );

		it( 'should create table model from some broken table', () => {
			editor.setData(
				'<table><td><p>foo</p></td></table>'
			);

			expectModel(
				'<table><tableRow><tableCell>foo</tableCell></tableRow></table>'
			);
		} );

		it( 'should fix if inside other blocks', () => {
			editor.model.schema.register( 'p', {
				inheritAllFrom: '$block'
			} );
			editor.conversion.for( 'upcast' ).add( upcastElementToElement( { model: 'p', view: 'p' } ) );

			editor.setData(
				'<p>foo' +
				'<table>' +
				'<tbody><tr><td>2</td></tr></tbody>' +
				'<thead><tr><td>1</td></tr></thead>' +
				'</table>' +
				'</p>'
			);

			expectModel(
				'<p>foo</p>' +
				'<table headingRows="1">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'</table>'
			);
		} );

		it( 'should be possible to overwrite table conversion', () => {
			editor.model.schema.register( 'fooTable', {
				allowWhere: '$block',
				allowAttributes: [ 'headingRows' ],
				isBlock: true,
				isObject: true
			} );

			editor.conversion.elementToElement( { model: 'fooTable', view: 'table', priority: 'high' } );

			editor.setData(
				'<table>' +
				'<thead><tr><td>foo</td></tr></thead>' +
				'</table>'
			);

			expectModel(
				'<fooTable></fooTable>'
			);
		} );
	} );

	describe( 'downcastTable()', () => {
		it( 'should create table with tbody', () => {
			setModelData( model,
				'<table>' +
				'<tableRow><tableCell></tableCell></tableRow>' +
				'</table>'
			);

			expect( getViewData( viewDocument, { withoutSelection: true } ) ).to.equal(
				'<table>' +
				'<tbody>' +
				'<tr><td></td></tr>' +
				'</tbody>' +
				'</table>'
			);
		} );

		it( 'should create table with tbody and thead', () => {
			setModelData( model,
				'<table headingRows="1">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'</table>'
			);

			expect( getViewData( viewDocument, { withoutSelection: true } ) ).to.equal(
				'<table>' +
				'<thead>' +
				'<tr><th>1</th></tr>' +
				'</thead>' +
				'<tbody>' +
				'<tr><td>2</td></tr>' +
				'</tbody>' +
				'</table>'
			);
		} );

		it( 'should create table with thead', () => {
			setModelData( model,
				'<table headingRows="2">' +
				'<tableRow><tableCell>1</tableCell></tableRow>' +
				'<tableRow><tableCell>2</tableCell></tableRow>' +
				'</table>'
			);

			expect( getViewData( viewDocument, { withoutSelection: true } ) ).to.equal(
				'<table>' +
				'<thead>' +
				'<tr><th>1</th></tr>' +
				'<tr><th>2</th></tr>' +
				'</thead>' +
				'</table>'
			);
		} );

		it( 'should be possible to overwrite', () => {
			editor.conversion.elementToElement( { model: 'tableRow', view: 'tr' } );
			editor.conversion.for( 'downcast' ).add( dispatcher => {
				dispatcher.on( 'insert:table', ( evt, data, conversionApi ) => {
					conversionApi.consumable.consume( data.item, 'insert' );

					const tableElement = conversionApi.writer.createContainerElement( 'table', { foo: 'bar' } );
					const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );

					conversionApi.mapper.bindElements( data.item, tableElement );
					conversionApi.writer.insert( viewPosition, tableElement );
				}, { priority: 'high' } );
			} );

			setModelData( model,
				'<table>' +
				'<tableRow><tableCell></tableCell></tableRow>' +
				'</table>'
			);

			expect( getViewData( viewDocument, { withoutSelection: true } ) ).to.equal(
				'<table foo="bar">' +
				'<tr><td></td></tr>' +
				'</table>'
			);
		} );
	} );

	describe( 'downcastTableCell()', () => {
		it( 'should be possible to overwrite row conversion', () => {
			editor.conversion.elementToElement( { model: 'tableCell', view: { name: 'td', class: 'foo' }, priority: 'high' } );

			setModelData( model,
				'<table>' +
				'<tableRow><tableCell></tableCell></tableRow>' +
				'</table>'
			);

			expect( getViewData( viewDocument, { withoutSelection: true } ) ).to.equal(
				'<table>' +
				'<tbody>' +
				'<tr><td class="foo"></td></tr>' +
				'</tbody>' +
				'</table>'
			);
		} );
	} );
} );
